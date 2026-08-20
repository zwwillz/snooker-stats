import { createClient } from "npm:@supabase/supabase-js@2"

const BUCKET = "player-avatars"
const SOURCE_PREFIX = "wst"
const TARGET_PREFIX = "wst/256"

const WIDTH = 256
const HEIGHT = 256
const QUALITY = 80

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}))

    const offset = Number(body.offset ?? 0)
    const limit = Math.min(Number(body.limit ?? 20), 25)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!

    // 优先使用新版 Secret Key，兼容旧 service_role
    let adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS")
    if (secretKeys) {
      try {
        const parsed = JSON.parse(secretKeys)
        if (parsed.default) adminKey = parsed.default
      } catch {}
    }

    if (!supabaseUrl || !adminKey) {
      throw new Error("Missing Supabase server credentials")
    }

    const supabase = createClient(supabaseUrl, adminKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 一次把当前 wst 目录列出来，129 张很小
    const { data: objects, error: listError } =
      await supabase.storage
        .from(BUCKET)
        .list(SOURCE_PREFIX, {
          limit: 1000,
          offset: 0,
          sortBy: {
            column: "name",
            order: "asc",
          },
        })

    if (listError) throw listError

    const pngFiles = (objects ?? [])
      .filter((item) => item.name.toLowerCase().endsWith(".png"))
      .map((item) => item.name)

    const batch = pngFiles.slice(offset, offset + limit)

    const results = []

    for (const filename of batch) {
      const uuid = filename.replace(/\.png$/i, "")

      const sourcePath = `${SOURCE_PREFIX}/${filename}`
      const targetPath = `${TARGET_PREFIX}/${uuid}.webp`

      try {
        // 调用 Supabase 自己的 Image Transformation
        // Accept: image/webp 让返回格式为 WebP
        const transformUrl =
          `${supabaseUrl}/storage/v1/render/image/public/` +
          `${BUCKET}/${sourcePath}` +
          `?width=${WIDTH}` +
          `&height=${HEIGHT}` +
          `&resize=contain` +
          `&quality=${QUALITY}`

        const transformed = await fetch(transformUrl, {
          headers: {
            Accept: "image/webp",
          },
        })

        if (!transformed.ok) {
          throw new Error(
            `Transform failed ${transformed.status}: ` +
            await transformed.text()
          )
        }

        const contentType =
          transformed.headers.get("content-type") ?? ""

        if (!contentType.includes("image/webp")) {
          throw new Error(
            `Expected image/webp but received ${contentType}`
          )
        }

        const webpBytes =
          new Uint8Array(await transformed.arrayBuffer())

        // 基础 WebP 文件头校验
        const header = new TextDecoder().decode(
          webpBytes.slice(0, 12)
        )

        if (
          !header.startsWith("RIFF") ||
          !header.includes("WEBP")
        ) {
          throw new Error("Invalid WebP output")
        }

        // 上传到 wst/256/{uuid}.webp
        const { error: uploadError } =
          await supabase.storage
            .from(BUCKET)
            .upload(targetPath, webpBytes, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: true,
            })

        if (uploadError) throw uploadError

        results.push({
          uuid,
          success: true,
          path: targetPath,
          bytes: webpBytes.length,
          kb: Number((webpBytes.length / 1024).toFixed(1)),
        })
      } catch (error) {
        results.push({
          uuid,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        })
      }

      // 顺序处理，避免并发占用过多资源
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const successCount =
      results.filter((x) => x.success).length

    const failureCount =
      results.filter((x) => !x.success).length

    return new Response(
      JSON.stringify(
        {
          sourceTotal: pngFiles.length,
          offset,
          requested: limit,
          processed: batch.length,
          successCount,
          failureCount,
          nextOffset: offset + batch.length,
          finished:
            offset + batch.length >= pngFiles.length,
          results,
        },
        null,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
})
