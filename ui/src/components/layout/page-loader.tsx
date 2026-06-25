import { AppLoader } from "@/components/app-loader";

export function PageLoader() {
  return (
    <AppLoader
      variant="page"
      label="Loading page"
      description="Fetching the latest view. This may take a moment on slower connections."
    />
  );
}
