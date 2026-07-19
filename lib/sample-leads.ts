import type { Lead } from "./types";

export const sampleLeads: Omit<Lead, "id">[] = [
  {
    name: "Priya Nair",
    email: "priya@brightloop.io",
    company: "BrightLoop",
    message:
      "We need a Next.js dashboard rebuilt with real-time analytics before our Series A demo in 3 weeks. Budget is around $8k. Can you start this week?",
  },
  {
    name: "Marcus Webb",
    email: "marcus.webb@fieldworks.co",
    company: "Fieldworks Co.",
    message:
      "Hi, just exploring options — might want to redo our marketing site sometime this year, not in a rush. What's your general process like?",
  },
  {
    name: "unknown",
    email: "promo@dealzblast.biz",
    company: "",
    message: "CONGRATULATIONS!! You've been selected for a FREE SEO audit + crypto investment opportunity, click now!!!",
  },
  {
    name: "Daniel Osei",
    email: "d.osei@northgatelogistics.com",
    company: "Northgate Logistics",
    message:
      "Someone on our team mentioned you build browser extensions. We might need one for internal tooling eventually, no timeline yet though.",
  },
];
