import React from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Users } from "lucide-react";
import InviteForm from "./InviteForm";
import { fetchAllInvites } from "~/server/actions/actions";
import InviteList from "./InviteList";
import type { DB_InviteType } from "~/server/db/schema";
const dynamic = "force-dynamic";

const InviteManagement = async () => {
  let invites: DB_InviteType[] = [];
  try {
    invites = await fetchAllInvites();
  } catch (error) {
    console.error("Failed to fetch invites:", error);
    // Consider returning an error UI or empty state
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-burgundy flex items-center space-x-2 text-xl font-semibold">
          <Users className="h-5 w-5" />
          <span>Invitations</span>
        </CardHeader>
        <CardContent className="space-y-6">
          <InviteForm />
          <InviteList invites={invites} />
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteManagement;
