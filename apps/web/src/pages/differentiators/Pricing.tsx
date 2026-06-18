import { Check, Sun } from "lucide-react";
import { Badge, Button, Card } from "../../components/ui";

const PLANS = [
  {
    name: "Team", price: "$49", unit: "/ user / month", highlight: false,
    tagline: "For single projects getting started.",
    features: ["Up to 10 users", "Cost Estimating + Cost Library", "Project Controls / EVM", "Dashboards & reporting", "Email support"],
  },
  {
    name: "Business", price: "$89", unit: "/ user / month", highlight: true,
    tagline: "For portfolios running CAPEX and turnarounds.",
    features: ["Unlimited users", "Everything in Team", "Full STO suite (weld, QA, execution)", "Portfolio & benchmarking", "AI Estimating Copilot", "Open API + connectors", "Priority support"],
  },
  {
    name: "Enterprise", price: "Custom", unit: "tailored", highlight: false,
    tagline: "For global operators with governance needs.",
    features: ["Everything in Business", "SSO / SAML, audit & data residency", "Dedicated environment & SLA", "Custom connectors & onboarding", "ESG / carbon reporting", "Named success manager"],
  },
];

export function PricingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600">
          <Sun size={14} /> Transparent, published pricing
        </div>
        <h1 className="text-3xl font-bold text-navy-900">Plans that scale with your projects</h1>
        <p className="mt-2 text-navy-700/60">Per-seat + module pricing. No "request a quote" wall — unlike the incumbents.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.name} className={`flex flex-col p-6 ${p.highlight ? "border-teal-500 ring-1 ring-teal-500" : ""}`}>
            {p.highlight && <Badge className="mb-2 w-fit bg-teal-50 text-teal-600">Most popular</Badge>}
            <h2 className="text-lg font-bold text-navy-900">{p.name}</h2>
            <p className="mt-1 text-sm text-navy-700/60">{p.tagline}</p>
            <div className="mt-4">
              <span className="text-3xl font-bold text-navy-900">{p.price}</span>
              <span className="text-sm text-navy-700/50"> {p.unit}</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-teal-500" /> <span className="text-navy-800">{f}</span>
                </li>
              ))}
            </ul>
            <Button variant={p.highlight ? "primary" : "ghost"} className="mt-6 w-full">
              {p.name === "Enterprise" ? "Contact sales" : "Start free trial"}
            </Button>
          </Card>
        ))}
      </div>
      <p className="text-center text-xs text-navy-700/40">Demo pricing page — illustrative only.</p>
    </div>
  );
}
