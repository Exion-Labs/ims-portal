"use client";

import React from "react";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { Button, Card } from "@ims/ui";

export default function RegisterTenantDisabledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-foreground">
              Tenant Registration Restricted
            </h1>
            <p className="text-[12px] text-muted-foreground">
              New organizations are provisioned by a Platform Administrator.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
