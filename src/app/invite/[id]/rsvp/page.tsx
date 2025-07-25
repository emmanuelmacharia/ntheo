import React from "react";
import { getInviteById } from "~/server/actions/actions";
import RsvpForm from "./rsvpForm";

const RsvpPage = async (props: { params: Promise<{ id: number }> }) => {
  const params = await props.params;
  console.log(typeof params.id, params.id);
  const parsedId = Number(params.id);
  const invite = await getInviteById(parsedId);
  return <RsvpForm invite={invite} id={parsedId} />;
};

export default RsvpPage;
