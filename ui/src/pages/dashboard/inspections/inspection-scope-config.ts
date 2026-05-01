import type { InspectionReviewLane } from "@/pages/dashboard/inspections/utils/inspection-review-filter";

export type InspectionScopeConfig = {
  title: string;
  description: string;
  inspectionType: "inbound" | "outbound";
  reviewLane?: InspectionReviewLane;
  checklistStatusPreset?: Array<"pass" | "fail">;
};

export const inspectionScopePresets = {
  inbound: {
    title: "Inbound inspections",
    description: "All inbound inspections for the selected period.",
    inspectionType: "inbound",
  },
  outbound: {
    title: "Outbound inspections",
    description: "All outbound inspections for the selected period.",
    inspectionType: "outbound",
  },
  inboundFailed: {
    title: "Inbound checklist failures",
    description:
      "Inbound inspections with at least one failed checklist layer (Outer/Inner/Product).",
    inspectionType: "inbound",
    checklistStatusPreset: ["fail"] as const,
  },
  outboundFailed: {
    title: "Outbound checklist failures",
    description:
      "Outbound inspections with at least one failed checklist layer (Outer/Inner/Product).",
    inspectionType: "outbound",
    checklistStatusPreset: ["fail"] as const,
  },
  inboundInReview: {
    title: "In-review inbound",
    description: "Inbound inspections pending quality review.",
    inspectionType: "inbound",
    reviewLane: "in_review" as const,
  },
  inboundRejected: {
    title: "Rejected inbound",
    description: "Inbound inspections rejected after review.",
    inspectionType: "inbound",
    reviewLane: "rejected" as const,
  },
  inboundApproved: {
    title: "Approved inbound",
    description: "Inbound inspections approved after review.",
    inspectionType: "inbound",
    reviewLane: "approved" as const,
  },
  outboundInReview: {
    title: "In-review outbound",
    description: "Outbound inspections pending quality review.",
    inspectionType: "outbound",
    reviewLane: "in_review" as const,
  },
  outboundRejected: {
    title: "Rejected outbound",
    description: "Outbound inspections rejected after review.",
    inspectionType: "outbound",
    reviewLane: "rejected" as const,
  },
  outboundApproved: {
    title: "Approved outbound",
    description: "Outbound inspections approved after review.",
    inspectionType: "outbound",
    reviewLane: "approved" as const,
  },
} satisfies Record<string, InspectionScopeConfig>;
