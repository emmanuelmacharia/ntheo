"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { DB_InviteType } from "~/server/db/schema";

const RsvpForm = (props: { invite: DB_InviteType | Error; id: number }) => {
  const router = useRouter();
  const [editRsvp, setEditRsvp] = useState(false);
  return (
    <>
      {
        // If the link is invalid
        (props.invite instanceof Error || !props.invite.id) && (
          <div className="from-primary via-african-terracotta to-african-gold flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <h2 className="text-destructive mb-4 text-2xl font-bold">
                  Invalid RSVP Link
                </h2>
                <p className="text-muted-foreground mb-6">
                  Please use the RSVP link from your invitation.
                </p>
                <Button onClick={() => router.push("/")} variant="outline">
                  Go to Wedding Site
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      }
      {
        // if the guest tries using an expired link
        !(props.invite instanceof Error) &&
          new Date(props.invite.inviteExpiration) > new Date() && (
            <div className="from-primary via-african-terracotta to-african-gold flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
              <Card className="w-full max-w-md">
                <CardContent className="p-8 text-center">
                  <h2 className="text-destructive mb-4 text-2xl font-bold">
                    Expired RSVP Link
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    The RSVP period is now over. You can still follow the event
                    by viewing the gallery
                  </p>
                  <Button onClick={() => router.push("/")} variant="outline">
                    Go to Wedding Site
                  </Button>
                </CardContent>
              </Card>
            </div>
          )
      }
      {
        // if the guest already registered their rsvp
        !(props.invite instanceof Error) && props.invite.rsvp && (
          <div className="from-primary via-african-terracotta to-african-gold flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <div className="bg-african-gold mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <Check className="text-african-earth h-8 w-8" />
                </div>
                <h2 className="text-african-earth mb-4 text-2xl font-bold">
                  RSVP Confirmed!
                </h2>
                <p className="text-muted-foreground mb-6">
                  {props.invite.accepted
                    ? "We're excited to celebrate with you on our special day!"
                    : "Thank you for letting us know. We'll miss having you there!"}
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push("/")}
                    variant="golden"
                    className="w-full"
                  >
                    Back to Wedding Site
                  </Button>
                  <Button
                    onClick={() => setEditRsvp(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Update RSVP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
      {
        // if the guest has not yet registered their rsvp or wishes to edit it
        !(props.invite instanceof Error) &&
          (!props.invite.rsvp || editRsvp) && (
            // show the invite form
            <div className="">Hello</div>
          )
      }
    </>
  );
};

export default RsvpForm;
