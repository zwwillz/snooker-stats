import type { Metadata } from "next";
import { loadPublicAboutStats, PUBLIC_ABOUT_STATS_AS_OF } from "@/lib/snooker/public-site-stats";
import AboutChrome from "./about-chrome";
import styles from "./about.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "关于147数据局",
  description: "147数据局是由斯诺克爱好者创建和维护的独立中文斯诺克数据网站，持续整理赛事、球员、比赛与统计分析数据。",
};

const CONTACT_EMAIL = "zw.will@outlook.com";
const nf = new Intl.NumberFormat("zh-CN");

export default function AboutPage() {
  const stats = loadPublicAboutStats();
  const scale = [
    { value: stats.players, label: "收录球员", note: "职业与历史球员" },
    { value: stats.events, label: "收录赛事", note: "巡回赛与历史赛事" },
    { value: stats.matches, label: "比赛记录", note: "持续补充与校验" },
    { value: stats.frames, label: "比赛局数", note: "Frame 级比赛数据" },
    { value: stats.h2hPairs, label: "交手记录", note: "球员 H2H 数据" },
  ];

  return (
    <main className={styles.page}>
      <AboutChrome />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <small className={styles.eyebrow}>ABOUT</small>
            <h1>关于147数据局</h1>
            <p className={styles.heroLead}>因为喜欢斯诺克，所以想把它的数据认真整理下来。</p>
            <p className={styles.heroText}>147数据局是一个由斯诺克爱好者创建和持续维护的独立数据网站，目前不以商业盈利为目的。我们希望长期整理赛事、球员和比赛数据，逐步建立一个更完整、更好用的中文斯诺克数据网站。</p>
            <div className={styles.heroTags} aria-label="项目特点">
              <span>独立维护</span><span>中文数据</span><span>持续更新</span>
            </div>
          </div>
          <aside className={styles.heroQuote}>
            <span>OUR GOAL</span>
            <strong>让中文斯诺克爱好者，更方便地找到数据、看懂数据、比较数据。</strong>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="about-scale-title">
          <div className={styles.sectionHead}>
            <div><small>DATABASE SCALE</small><h2 id="about-scale-title">一个不断增长的斯诺克数据库</h2></div>
            <p>数据统计截至{PUBLIC_ABOUT_STATS_AS_OF}，后续随新赛事和历史资料整理定期更新。</p>
          </div>
          <div className={styles.statsGrid}>
            {scale.map((item) => (
              <article className={styles.statCard} key={item.label}>
                <strong>{nf.format(item.value)}<sup>+</sup></strong>
                <span>{item.label}</span>
                <small>{item.note}</small>
              </article>
            ))}
            <article className={`${styles.statCard} ${styles.coverageCard}`}>
              <strong>1977<em>— 至今</em></strong>
              <span>数据收录年份</span>
              <small>完整覆盖1977年至今的世界斯诺克巡回赛；1977年以前收录部分历史赛事。</small>
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sourceSection}`} aria-labelledby="about-source-title">
          <div className={styles.sectionHead}>
            <div><small>DATA SOURCES</small><h2 id="about-source-title">数据从哪里来</h2></div>
          </div>
          <div className={styles.sourceLayout}>
            <div className={styles.sourceCopy}>
              <p>147数据局主要依据公开的斯诺克赛事信息及历史资料进行整理。主要来源包括 <strong>World Snooker Tour（WST）</strong>、<strong>World Professional Billiards and Snooker Association（WPBSA）</strong>，同时参考 Snooker.org、CueTracker 等海外斯诺克爱好者网站及其他公开历史资料。</p>
              <p>不同来源在球员名称、赛事结构、比赛阶段和历史记录上可能存在差异，因此我们并不是简单展示某一个来源的数据，而是持续进行整理、校验和关联。</p>
            </div>
            <div className={styles.sourceCards}>
              <article><span>OFFICIAL</span><strong>WST</strong><small>职业巡回赛赛事、球员与比赛资料</small></article>
              <article><span>OFFICIAL</span><strong>WPBSA</strong><small>排名、规则及相关官方资料</small></article>
              <article><span>PUBLIC DATA</span><strong>公开资料</strong><small>海外数据库、历史记录与爱好者资料</small></article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.warehouseSection}`} aria-labelledby="about-warehouse-title">
          <div className={styles.sectionHead}>
            <div><small>DATA WAREHOUSE</small><h2 id="about-warehouse-title">从原始资料，到可以使用的数据</h2></div>
            <p>147数据局建立了自己的斯诺克数据仓库和数据处理体系。</p>
          </div>
          <div className={styles.pipeline} aria-label="147数据局数据处理流程">
            <div><small>01</small><strong>公开资料</strong><span>赛事与历史数据</span></div>
            <i aria-hidden="true">→</i>
            <div><small>02</small><strong>整理 · 中文化</strong><span>统一名称与表达</span></div>
            <i aria-hidden="true">→</i>
            <div className={styles.pipelineCore}><small>03</small><strong>147数据仓库</strong><span>校验 · 关联 · 结构化</span></div>
            <i aria-hidden="true">→</i>
            <div><small>04</small><strong>统计 · 对比</strong><span>衍生指标与分析</span></div>
            <i aria-hidden="true">→</i>
            <div><small>05</small><strong>预测 · AI</strong><span>未来持续扩展</span></div>
          </div>
          <div className={styles.statement}>
            <span>记录比赛只是开始</span>
            <strong>我们更希望通过数据理解斯诺克。</strong>
            <p>在基础数据之上，147数据局会持续增加球员表现、胜率、历史交手、赛季表现、排名变化、比赛趋势和球员对比等统计能力。未来还计划逐步加入统计模型、比赛预测以及 AI 数据分析。</p>
          </div>
        </section>

        <section className={styles.notesGrid} aria-label="数据说明与使用规则">
          <article className={styles.noteCard}>
            <small>DATA QUALITY</small>
            <h2>关于数据准确性</h2>
            <p>我们会尽可能核对和整理每一项数据。但斯诺克赛事历史很长，不同时期的数据保存情况不同，不同资料来源之间也可能存在记录差异，因此部分历史赛事仍可能存在遗漏、错误或信息不完整。</p>
            <p className={styles.inlineContact}>147数据局会持续补充和校正。如果你发现数据问题，欢迎 <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("147数据局数据纠错")}`}>反馈数据问题 <span aria-hidden="true">→</span></a></p>
          </article>

          <article className={styles.noteCard}>
            <small>DATA USE</small>
            <h2>数据可以怎样使用</h2>
            <p>欢迎个人查询、学习研究、文章引用、社交媒体讨论以及少量非商业数据引用。引用由147数据局整理或计算的数据时，欢迎注明“数据来源：147数据局”及相应页面。</p>
            <p>未经许可，请勿通过爬虫、脚本或自动化程序进行批量抓取、批量下载、系统性复制、建立数据镜像、绕过访问限制，或将本站整理的数据用于未经授权的商业产品和二次分发。</p>
            <strong className={styles.ruleEmphasis}>正常查询和少量引用没有问题，我们限制的是对数据库进行系统性、批量化复制。</strong>
          </article>
        </section>

        <section className={styles.futureNote}>
          <div><small>STATISTICS & AI</small><h2>关于统计、预测和 AI</h2></div>
          <p>本站部分指标由147数据局依据比赛记录重新计算，并非赛事官方直接公布。未来的比赛预测、胜率模型及 AI 分析主要用于斯诺克数据研究、分析与交流，所有统计和预测结果仅供参考，不代表实际比赛结果，也不构成任何投注或博彩建议。</p>
        </section>

        <section className={styles.support} aria-labelledby="about-support-title">
          <div className={styles.supportCopy}>
            <small>KEEP IT GROWING</small>
            <h2 id="about-support-title">一起让147数据局变得更好</h2>
            <p>147数据局目前主要依靠个人兴趣持续建设和维护。随着数据和访问量增加，也会持续产生服务器、数据库、存储、网络、CDN 和数据处理等成本。</p>
            <p>如果你愿意提供服务器、云计算、数据库、存储、网络带宽、CDN、相关费用资助、技术支持、历史资料或其他资源支持，都非常欢迎。</p>
            <div className={styles.supportTags}><span>服务器 / 云资源</span><span>数据库 / 存储</span><span>CDN / 网络</span><span>费用资助</span><span>历史资料</span><span>技术支持</span></div>
          </div>
          <div className={styles.contactCard}>
            <p>如果你愿意提供历史资料、资源支持、技术帮助或其他建议，欢迎 <a href={`mailto:${CONTACT_EMAIL}`}>联系147数据局 <span aria-hidden="true">→</span></a></p>
          </div>
        </section>

        <section className={styles.independent}>
          <h2>独立项目说明</h2>
          <p>147数据局是由斯诺克爱好者独立创建和维护的数据项目。除非页面中特别注明，本站与 World Snooker Tour（WST）、WPBSA 以及相关赛事组织、球员或商业机构之间不存在隶属关系，也不代表相关机构的官方立场。网站中出现的赛事名称、组织名称、球员姓名、标识及其他相关内容，其相应权利归原权利人所有。</p>
          <p className={styles.thanks}>感谢任浩江老师在网站建设过程中提供的宝贵建议。</p>
        </section>

        <footer className={styles.footer}>
          <span>147数据局</span>
          <strong>记录比赛，也记录斯诺克的历史。</strong>
        </footer>
      </div>
    </main>
  );
}
