"use client";

import { Copy, Share, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { deleteInvite } from "~/server/actions/actions";
import { toast } from "sonner";

const InviteActions = (props: { id: number }) => {
  const [link] = useState(`${window.location.origin}/invite/${props.id}`);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    toast.message(`Invite link for ${props.id} copied to the clipboard`, {
      style: { color: "#BE5103" },
    });
  };
  const handleSharing = async () => {
    const text = `Moureen and Emmanuel invite you to our Ntheo ceremony. Visit ${link} to rsvp`;
    await navigator.share({
      title: `Ntheo ceremony`,
      text: text,
      url: link,
    });
  };
  const handleDelete = async () => {
    // handle deletion with server action
    try {
      await deleteInvite(props.id);
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="hover:bg-gold/50 hover:cursor-pointer"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSharing}
        className="hover:bg-gold/50 hover:cursor-pointer"
      >
        <Share className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        className="hover:bg-gold/50 hover:cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default InviteActions;
