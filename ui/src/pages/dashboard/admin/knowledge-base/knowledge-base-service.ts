/**
 * Knowledge Base articles: issue + solution with copy-paste commands for troubleshooting.
 */
export type KbCategory =
  | "PostgreSQL"
  | "FastAPI"
  | "ReactJS"
  | "Okta"
  | "AWS"
  | "Docker"
  | "Network";

/** One command per block: no chaining (no &&) or multiple commands. */
export interface KbCommandBlock {
  command: string;
  commandHelper?: string;
}

export interface KbArticle {
  id: string;
  category: KbCategory;
  title: string;
  issue: string;
  solution: string;
  /** Array of single commands, each with optional helper. One command per block. */
  commands: KbCommandBlock[];
}

export const kbCategories: KbCategory[] = [
  "PostgreSQL",
  "FastAPI",
  "ReactJS",
  "Okta",
  "AWS",
  "Docker",
  "Network",
];

export const kbArticles: KbArticle[] = [
  {
    id: "pg-restart",
    category: "PostgreSQL",
    title: "Restart PostgreSQL service",
    issue:
      "PostgreSQL is not accepting connections, or you need to apply config changes.",
    solution:
      "Restart the PostgreSQL service with systemctl. Ensure you have sudo or appropriate privileges.",
    commands: [
      {
        command: "sudo systemctl restart postgresql",
        commandHelper:
          "Run from a terminal with sudo. Check status with: sudo systemctl status postgresql",
      },
    ],
  },
  {
    id: "fastapi-restart",
    category: "FastAPI",
    title: "Restart FastAPI / Uvicorn app",
    issue:
      "FastAPI app is stuck, returning 502, or you deployed new code and need to reload.",
    solution:
      "If using systemd or a process manager, restart the service. For development, use --reload so code changes apply automatically.",
    commands: [
      {
        command: "sudo systemctl restart fastapi-app",
        commandHelper:
          "Replace fastapi-app with your systemd service name. Find it in /etc/systemd/system/",
      },
    ],
  },
  {
    id: "react-build",
    category: "ReactJS",
    title: "React build fails or dev server won't start",
    issue:
      "npm run build fails with module not found, or npm start hangs / shows EADDRINUSE.",
    solution:
      "Clear node_modules and lockfile, reinstall, and ensure port 5173 (Vite) or 3000 (CRA) is free. Run each command from project root in order.",
    commands: [
      {
        command: "rm -rf node_modules package-lock.json",
        commandHelper: "Removes existing dependencies and lockfile.",
      },
      {
        command: "npm install",
        commandHelper: "Reinstalls dependencies from package.json.",
      },
      {
        command: "npm run dev",
        commandHelper:
          "Starts dev server. If port in use: lsof -ti:5173 | xargs kill -9",
      },
    ],
  },
  {
    id: "okta-saml",
    category: "Okta",
    title: "Okta SAML / SSO not redirecting or metadata errors",
    issue:
      "Login redirects to Okta but then fails with invalid SAML response or metadata URL not reachable.",
    solution:
      "Ensure your app's ACS URL and entity ID match Okta's configuration. Metadata must be publicly reachable.",
    commands: [
      {
        command: "curl -sI https://your-app.com/auth/saml/metadata",
        commandHelper:
          "Replace with your app metadata URL. Confirms the URL is reachable from the server.",
      },
    ],
  },
  {
    id: "aws-s3-cors",
    category: "AWS",
    title: "S3 CORS or access denied from browser",
    issue:
      "Frontend gets CORS errors when calling S3, or 403 Access Denied on GetObject.",
    solution:
      "Add a CORS configuration on the bucket and ensure the bucket policy (or IAM) allows the required actions.",
    commands: [
      {
        command:
          "aws s3api put-bucket-cors --bucket YOUR_BUCKET --cors-configuration file://cors.json",
        commandHelper:
          "Create cors.json first with AllowedOrigins, AllowedMethods, and AllowedHeaders for your app domain.",
      },
    ],
  },
  {
    id: "docker-restart",
    category: "Docker",
    title: "Restart Docker containers or daemon",
    issue:
      "Containers are unresponsive, or you need to apply new env/config and restart.",
    solution:
      "Restart specific containers with docker compose or docker restart. For daemon issues, restart the Docker service.",
    commands: [
      {
        command: "sudo systemctl restart docker",
        commandHelper:
          "Restarts the Docker daemon. For a single container use: docker restart <container_name_or_id>",
      },
    ],
  },
  {
    id: "network-ports",
    category: "Network",
    title: "Check if port is in use or open firewall",
    issue:
      "Application cannot bind to port (already in use) or remote connections are blocked.",
    solution:
      "Use lsof or netstat to see which process uses a port. On Linux, open the port in firewalld or ufw if needed.",
    commands: [
      {
        command: "lsof -i :5432",
        commandHelper: "Replace 5432 with your port. Shows process using the port.",
      },
      {
        command: "sudo firewall-cmd --permanent --add-port=5432/tcp",
        commandHelper: "Then run: sudo firewall-cmd --reload",
      },
      {
        command: "sudo ufw allow 5432/tcp",
        commandHelper: "Ubuntu/Debian. Then run: sudo ufw reload",
      },
    ],
  },
];

export function getKbArticles(): Promise<KbArticle[]> {
  return Promise.resolve([...kbArticles]);
}

export function getKbArticlesByCategory(
  category: KbCategory,
): Promise<KbArticle[]> {
  return Promise.resolve(kbArticles.filter((a) => a.category === category));
}
