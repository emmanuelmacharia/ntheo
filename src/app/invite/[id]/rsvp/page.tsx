import React from "react";
import { getInviteById } from "~/server/actions/actions";
import RsvpForm from "./rsvpForm";

const RsvpPage = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const parsedId = Number(params.id);
  if (isNaN(parsedId) || parsedId <= 0) {
    return (
      <div className="text-center">
        <p className="text-destructive">Invalid invite link</p>
      </div>
    );
  }
  const invite = await getInviteById(parsedId);
  return <RsvpForm invite={invite} id={parsedId} />;
};

export default RsvpPage;
