import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

type OktaSetupGuideAccordionProps = {
  signInRedirectUri?: string;
};

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {step}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function OktaSetupGuideAccordion({
  signInRedirectUri = "https://whirlpool.scoptanalytics.in/authorization-code/callback",
}: OktaSetupGuideAccordionProps) {
  const signOutRedirect =
    signInRedirectUri.replace(/\/authorization-code\/callback\/?$/, "") ||
    "https://whirlpool.scoptanalytics.in";

  return (
    <Card className="my-4 gap-0 overflow-hidden py-0">
      <Accordion type="single" collapsible>
        <AccordionItem value="okta-setup-guide" className="border-none">
          <AccordionTrigger className="px-6 py-5 hover:no-underline data-[state=open]:border-b data-[state=open]:bg-muted/30">
            <div className="flex flex-1 items-start gap-3 pr-2 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                <BookOpen className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base leading-snug">
                  Configure Okta SSO with OAuth application
                </CardTitle>
                <CardDescription className="text-sm">
                  Step-by-step guide for your Okta admin console. Expand when
                  you are wiring up the integration.
                </CardDescription>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-6 pb-6">
            <div className="space-y-6 pt-1">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  Required values from your Okta admin console
                </h3>

                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Okta Domain</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Example: https://trial-5808139.okta.com
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Client ID</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Generated after creating the Okta application.
                    </div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Client Secret</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Available under the application client credentials
                      section.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <StepCard step={1} title="Create a new Okta app integration">
                  <p className="text-sm text-muted-foreground">
                    Go to the Okta Admin Console and create a new app
                    integration.
                  </p>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div>
                      <span className="font-medium">Sign-in method:</span> OIDC
                      — OpenID Connect
                    </div>
                    <div>
                      <span className="font-medium">Application type:</span> Web
                      Application
                    </div>
                  </div>
                </StepCard>

                <StepCard
                  step={2}
                  title="Configure the application properties"
                >
                  <p className="text-sm text-muted-foreground">
                    Enter the application name and configure the redirect URLs.
                  </p>
                  <div className="space-y-3 rounded-md bg-muted p-3 text-sm">
                    <div>
                      <div className="font-medium">Application name</div>
                      <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                        Whirlpool PDI
                      </code>
                    </div>
                    <div>
                      <div className="font-medium">Sign-in redirect URI</div>
                      <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-xs">
                        {signInRedirectUri}
                      </code>
                    </div>
                    <div>
                      <div className="font-medium">Sign-out redirect URI</div>
                      <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-xs">
                        {signOutRedirect}
                      </code>
                    </div>
                  </div>
                </StepCard>

                <StepCard step={3} title="Enable the required grant type">
                  <p className="text-sm text-muted-foreground">
                    Make sure the application uses the Authorization Code flow
                    for OAuth 2.0 login.
                  </p>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div>
                      <span className="font-medium">Grant type:</span>{" "}
                      Authorization Code
                    </div>
                    <div>
                      <span className="font-medium">Refresh Token:</span>{" "}
                      Optional, enable only if your backend requires refresh
                      token support.
                    </div>
                  </div>
                </StepCard>

                <StepCard step={4} title="Copy the client credentials">
                  <p className="text-sm text-muted-foreground">
                    After saving the application, copy the values required for
                    backend integration into the form above.
                  </p>
                  <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
                    <div>
                      <span className="font-medium">Okta Domain:</span>{" "}
                      <code className="rounded bg-background px-1 py-0.5 text-xs">
                        https://your-okta-domain.okta.com
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Okta Client ID:</span>{" "}
                      <code className="rounded bg-background px-1 py-0.5 text-xs">
                        Generated by Okta
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Okta Client Secret:</span>{" "}
                      <code className="rounded bg-background px-1 py-0.5 text-xs">
                        Generated by Okta
                      </code>
                    </div>
                  </div>
                </StepCard>

                <StepCard
                  step={5}
                  title="Configure authorization server access policy"
                >
                  <p className="text-sm text-muted-foreground">
                    Go to the Okta access policy section and make sure the OAuth
                    application is allowed to issue tokens.
                  </p>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="font-medium">Navigation path</div>
                    <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                      Security → API → Authorization Servers → default → Access
                      Policies
                    </code>
                    <div className="mt-3 font-medium">Recommended rule setup</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>Grant type should include Authorization Code.</li>
                      <li>
                        User should be assigned to the application or group.
                      </li>
                      <li>
                        Scopes can be set to any scopes, or restricted as
                        needed.
                      </li>
                      <li>
                        Access token lifetime can be configured as per policy.
                      </li>
                    </ul>
                  </div>
                </StepCard>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold">Important note</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The Okta Domain, Client ID, and Client Secret must be saved
                    in the configuration form above. Without these values, OAuth
                    login cannot be completed.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
