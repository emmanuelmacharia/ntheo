import React from "react";
import type { DB_InviteType } from "~/server/db/schema";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import InviteActions from "./InviteActions";

const InviteList = (props: { invites: DB_InviteType[] | [] }) => {
  const { invites } = props;
  return (
    <>
      <section className="mb-4 flex items-center justify-between">
        <h3 className="text-burgundy font-semibold">
          Guest List ({invites.length})
        </h3>
        <Button variant="outline" size="sm">
          View RSVP Summary
        </Button>
      </section>
      <div className="space-y-3">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="border-pink/20 hover:bg-pink/5 flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-burgundy font-medium">{invite.name}</span>
                {invite.inviteFamily && (
                  <Badge variant="secondary">Family</Badge>
                )}
              </div>
              {invite.familyName && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {invite.familyName}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                ID: {invite.id}
              </p>
            </div>
            <InviteActions id={invite.id} />
          </div>
        ))}
      </div>
    </>
  );
};

export default InviteList;
