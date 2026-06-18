import { useState } from "react";
import { Code2, Copy, ExternalLink, KeyRound } from "lucide-react";
import { Badge, Button, Card } from "../../components/ui";

// Mock API keys (demo only — never real secrets).
const MOCK_KEYS = [
  { label: "Production", key: "hk_live_3f9a2c7e1b8d4a60b5e2f1c9d7a3e8b4", scopes: "read,write" },
  { label: "Sandbox", key: "hk_test_a1b2c3d4e5f60718293a4b5c6d7e8f90", scopes: "read" },
];

export function DevPortalPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (k: string) => {
    navigator.clipboard?.writeText(k);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Code2 className="text-teal-500" />
        <h1 className="text-2xl font-bold text-navy-900">Developer / API Portal</h1>
        <Badge className="bg-teal-50 text-teal-600">open platform</Badge>
      </div>
      <p className="max-w-2xl text-navy-700/70">
        Every Helios capability is a documented REST endpoint secured with JWT and RBAC.
        Build integrations, automate workflows, or pipe data into your own tools.
      </p>

      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="font-semibold text-navy-900">OpenAPI / Swagger</div>
          <div className="text-sm text-navy-700/60">Interactive docs for every endpoint, auto-generated.</div>
        </div>
        <a href="/api/docs" target="_blank" rel="noreferrer">
          <Button><ExternalLink size={15} /> Open API docs</Button>
        </a>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold text-navy-900">
          <KeyRound size={16} className="text-amber-500" /> API keys <Badge className="bg-amber-50 text-amber-600">mock</Badge>
        </div>
        <div className="space-y-2">
          {MOCK_KEYS.map((k) => (
            <div key={k.key} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-navy-900">{k.label} <span className="ml-1 text-xs text-navy-700/50">scopes: {k.scopes}</span></div>
                <code className="text-xs text-navy-700/70">{k.key}</code>
              </div>
              <button onClick={() => copy(k.key)} className="flex items-center gap-1 rounded border border-navy-100 px-2 py-1 text-xs text-navy-700 hover:bg-white">
                <Copy size={12} /> {copied === k.key ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 font-semibold text-navy-900">Sample request</div>
        <pre className="overflow-x-auto rounded-lg bg-navy-800 p-3 text-xs text-navy-100">
{`# Authenticate
curl -X POST http://localhost:3001/api/auth/login \\
  -H 'content-type: application/json' \\
  -d '{"email":"admin@helios.demo","password":"Helios@Demo123"}'

# Call an endpoint with the returned token
curl http://localhost:3001/api/projects \\
  -H 'authorization: Bearer <token>'`}
        </pre>
      </Card>
    </div>
  );
}
