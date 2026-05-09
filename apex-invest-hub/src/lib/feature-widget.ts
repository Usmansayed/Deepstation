import { toast } from "sonner";

export function showAppWidget(title: string, details: string) {
  toast(title, {
    description: details,
    duration: 2200,
  });
}

export function showFutureFeature(feature: string, details?: string) {
  toast(feature, {
    description: details ?? "We will implement this feature later.",
    duration: 2600,
  });
}
