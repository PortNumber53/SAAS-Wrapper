# SAAS Wrapper



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/serious-hosting/saas-wrapper.git
git branch -M master
git push -uf origin master
```

## Integrate with your tools

- [ ] [Set up project integrations](https://gitlab.com/serious-hosting/saas-wrapper/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

## Cloudflare Workers Deployment

- Frontend lives under `frontend/` and deploys to Cloudflare Workers via Wrangler.
- Runtime configuration is provided via Cloudflare Variables and Secrets (not committed).

### Required runtime variables/secrets

- BACKEND_ORIGIN: e.g. https://api.example.com
- XATA_DATABASE_URL: e.g. https://<workspace>.<region>.xata.sh/db/<db>
- XATA_BRANCH: e.g. main
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (secrets)
- XATA_API_KEY (secret)
- STRIPE_SECRET_KEY (secret) — Stripe API key for product/price/Checkout APIs

### Local dev

Recommended: run Vite (HMR) + Wrangler together

- In `frontend/` copy `.dev.vars.example` to `.dev.vars` and set your vars. For Worker auto-reload helpers, set `DEV_AUTORELOAD=1`.
- For Stripe in dev, add `STRIPE_SECRET_KEY=sk_test_xxx` to `.dev.vars` (webhooks optional).
- Start both dev servers (Workers on 8787, Vite on 5173):

```
cd frontend
npm i
npm run dev:full
```

- Open `http://localhost:5173` for full hot-module replacement. All `/api/*` calls proxy to Wrangler at `http://127.0.0.1:8787`.

Alternative: Worker-only dev

- `npx wrangler dev` will serve the Worker and inject a small auto-reload that refreshes the page on Worker rebuilds. This is best for testing Worker-only changes; frontend HMR works best via Vite as above.

### GitLab CI example (production)

Below is an example `deploy` job that installs dependencies and deploys the Worker with production variables. Store secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, XATA_API_KEY) as protected CI/CD variables in GitLab and non-secrets (BACKEND_ORIGIN, XATA_DATABASE_URL, XATA_BRANCH) as variables too.

```
stages:
  - test
  - deploy

deploy_production:
  image: node:20
  stage: deploy
  rules:
    - if: "$CI_COMMIT_BRANCH == 'master'"
  before_script:
    - cd frontend
    - npm ci
    # Authenticate Wrangler (use CF_API_TOKEN as a protected variable with "Edit Workers" perms)
    - test -n "$CF_API_TOKEN" || (echo "Missing CF_API_TOKEN" && exit 1)
    # Provide secrets non-interactively
    - printf "%s" "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID --yes
    - printf "%s" "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET --yes
    - printf "%s" "$XATA_API_KEY" | npx wrangler secret put XATA_API_KEY --yes
  script:
    - npx wrangler deploy \
        --var BACKEND_ORIGIN="$BACKEND_ORIGIN" \
        --var XATA_DATABASE_URL="$XATA_DATABASE_URL" \
        --var XATA_BRANCH="$XATA_BRANCH"
  environment:
    name: production
    url: $WORKER_PUBLIC_URL
  only:
    - master
```

Notes:
- Set `CF_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as CI variables. Wrangler reads them from env.
- Optionally set `WORKER_PUBLIC_URL` to your worker URL for visibility in GitLab environments.

## Stripe integration

- Worker endpoints:
  - `GET/POST /api/stripe/products` — list/create Stripe products (stored per user)
  - `GET/POST /api/stripe/prices` — list/create Stripe prices (one-time or recurring)
  - `POST /api/stripe/checkout` — create a Stripe Checkout session for a given price
- Frontend page: `/account/commerce` to create products/prices.
- Database: tables `stripe_products`, `stripe_prices` in `db/schema.sql` (apply to your DB).
- Secrets: set `STRIPE_SECRET_KEY` in the Worker (Wrangler secret).


# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
