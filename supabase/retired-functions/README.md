# Retired Edge Functions

These sources mirror endpoints that remain deployed only as disabled 404/410
stubs:

- wst-avatar-probe
- wst-avatar-import
- avatar-resize-probe

They live outside supabase/functions/ so a bulk function deployment cannot
reactivate them. Remove the remote endpoints separately only after confirming
that no operational workflow still references their URLs.
