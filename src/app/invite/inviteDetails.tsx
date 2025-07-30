"use client";
import { Calendar, Clock, MapPin } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import type { DB_InviteType } from "~/server/db/schema";
import { useRouter } from "next/navigation";

const InviteDetails = (props: { invite: DB_InviteType | Error }) => {
  const [inviteError, setInviteError] = useState(false);
  const router = useRouter();
  const [rsvp, setRsvp] = useState("");

  useEffect(() => {
    if (props.invite instanceof Error) {
      setInviteError(true);
    } else {
      setRsvp(`/invite/${props.invite.id}/rsvp`);
    }
  }, [props.invite]);

  return (
    <>
      {inviteError && (
        <p className="text-burnt-orange text-xl">
          We had an issue retrieving this invite. Please confirm your link
        </p>
      )}
      {!(props.invite instanceof Error) && (
        <>
          <div>
            <h2 className="text-burgundy -mt-2 mb-4 font-sans text-2xl">
              You Are Cordially Invited
            </h2>
            <div className="text-burnt-orange mb-2 text-xl">
              Dear {props.invite.name},
            </div>
            {props.invite.inviteFamily && props.invite.familyName && (
              <div className="text-muted-foreground mb-4 text-lg">
                {props.invite.familyName}
              </div>
            )}
            <p className="text-foreground mb-4 text-base leading-relaxed">
              We joyfully request your presence at our Ntheo ceremony as we
              unite in love and celebrate with our community.
            </p>
          </div>
          <div className="mb-8 space-y-6 text-left">
            <div className="bg-pink/10 flex items-center space-x-4 rounded-lg p-4">
              <Calendar className="text-burgundy h-6 w-6" />
              <div className="">
                <div className="text-burnt-orange font-semibold">
                  Saturday 9th August, 2025
                </div>
                <div className="text-muted-foreground">
                  Traditional ceremony
                </div>
              </div>
            </div>
            <div className="bg-pink/10 flex items-center space-x-4 rounded-lg p-4">
              <Clock className="text-burgundy h-6 w-6" />
              <div>
                <div className="text-burnt-orange font-semibold">
                  10:00 AM - 4:00 PM
                </div>
                <div className="text-muted-foreground">
                  Ceremony & Reception
                </div>
              </div>
            </div>
            <div className="bg-pink/10 flex items-center space-x-4 rounded-lg p-4">
              <MapPin className="text-burgundy h-6 w-6" />
              <div>
                <div className="text-burnt-orange font-semibold">
                  Moureen&apos;s home
                </div>
                <div className="text-muted-foreground">Kakuyuni, Kangundo</div>
              </div>
            </div>
          </div>
          <div className="space-y-4 text-center">
            <Button
              onClick={() => router.push(rsvp)}
              className="w-full"
              variant="burntOrange"
              size="lg"
            >
              RSVP Now
            </Button>
            <p className="text-muted-foreground text-sm">
              Please respond by August 2nd, 2025
            </p>
          </div>
        </>
      )}
    </>
  );
};

export default InviteDetails;
