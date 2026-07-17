#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

npm run build
npx wrangler pages dev dist --d1=DB=a440f050-d24e-4008-aeb9-ed97d0081b29
