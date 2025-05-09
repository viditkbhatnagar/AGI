import { HelmetProvider } from "react-helmet-async";

interface HelmetProviderWrapperProps {
  children: React.ReactNode;
}

export function HelmetProviderWrapper({ children }: HelmetProviderWrapperProps) {
  return (
    <HelmetProvider>
      {children}
    </HelmetProvider>
  );
}

export default HelmetProviderWrapper;
