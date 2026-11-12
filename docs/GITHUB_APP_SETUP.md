# GitHub App setup for DSAHub

DSAHub keeps GitHub sign-in separate from repository write access. The GitHub OAuth sign-in only identifies the account; repository synchronization uses a GitHub App installation token.

## 1. Create the GitHub App

Open [GitHub Developer Settings → New GitHub App](https://github.com/settings/apps/new).

Suggested settings for local development:

- GitHub App name: choose a unique name such as `DSAHub Repository Sync`.
- Homepage URL: `http://localhost:3000`.
- Webhook: disable it for this manual-sync MVP.
- Where can this GitHub App be installed?: Only on this account (the currently supported flow is personal-account installations).

Under **Repository permissions**, set only:

- Contents: Read and write.

Leave other repository permissions at their default / no access. GitHub grants repository metadata read permission automatically.

Save the app. Copy its **App ID** (not Client ID), then generate a **Private key** from the app's settings page.

## 2. Install the app

Install the new app on the same personal GitHub account that you use to sign in to DSAHub. Select only the repositories that DSAHub should be allowed to write to.

Open your GitHub app installation settings and copy the numeric installation ID from the URL, which is shown in the installation settings path.

The current DSAHub flow verifies that the installation belongs to the GitHub identity used for the DSAHub session. Organization installations are not supported in this version.

## 3. Configure the DSAHub server

Add these variables to `apps/web/.env.local`:

~~~env
GITHUB_APP_ID=your_numeric_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"
~~~

The private key may also be entered as a normal multiline PEM value. Keep it server-side only. Never use a `NEXT_PUBLIC_` prefix, paste it into the browser, or commit it to Git.

Restart the web server after changing environment variables:

~~~powershell
npm run dev
~~~

## 4. Connect and select a repository

1. Sign in to DSAHub and open `/github-sync`.
2. Enter your GitHub App installation ID and click **Verify installation**.
3. Select an installed repository.
4. Choose the target branch and folder, for example `main` and `solutions`.
5. Save the destination.

The app mints an installation access token restricted to the selected repository and Contents write permission when it needs to read or write a file. Installation tokens expire after one hour and are not stored in MongoDB.

## 5. Manually sync a solution

1. Select an accepted submission recorded in DSAHub.
2. Paste the corresponding solution source code.
3. Check the explicit code-transfer confirmation.
4. Click **Sync solution to GitHub**.

The source code is sent from the page to the server for that request and forwarded to GitHub. It is not saved in MongoDB. DSAHub stores only the submission metadata and sync record.

Files are named from the problem slug and language extension inside the selected folder. DSAHub refuses to overwrite a file at that path unless it already has a sync record for the same submission.

## Current limitations

- Manual code sync only. Automatic source-code capture from LeetCode is not enabled.
- Personal GitHub account installations only; organization installations need a verified installation callback flow.
- Repository list fetch currently reads the first 100 repositories returned by GitHub.
- Syncing requires the GitHub App to be installed on the target repository with Contents write access.
