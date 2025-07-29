"use client";
import { Bus, Car, Check, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { updateRsvpForm } from "~/server/actions/actions";
import type { DB_InviteType } from "~/server/db/schema";

const RsvpForm = (props: { invite: DB_InviteType | Error; id: number }) => {
  const router = useRouter();
  const [editRsvp, setEditRsvp] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const [submissionSucceeded, setSubmissionSucceeded] = useState(false);

  const [form, setForm] = useState({
    attending: "",
    guestCount: "1",
    requiresTransportation: "",
  });
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.attending) {
      // Show error message or prevent submission
      return;
    }

    if (form.attending === "yes" && !form.requiresTransportation) {
      // Show error message for missing transportation preference
      return;
    }
    const payload: {
      rsvp: boolean;
      accepted: boolean;
      numberOfGuests: number;
      requiresTransport: boolean;
    } = {
      rsvp: true,
      accepted: form.attending === "yes" ? true : false,
      numberOfGuests: Number(form.guestCount),
      requiresTransport: form.requiresTransportation === "yes" ? true : false,
    };

    const submission = await updateRsvpForm(payload, props.id);

    if (submission instanceof Error) {
      console.error("Error updating invite details", submission);
      setSubmissionError(true);
    } else {
      // setSubmissionSucceeded(true);
    }
  };

  return (
    <>
      {
        // if the submission fails
        submissionError && (
          <div className="w-full">
            <div className="p-8 text-center">
              <h2 className="text-destructive mb-4 text-2xl font-bold">
                Error registering your submission
              </h2>
              <p className="text-muted-foreground mb-6">
                We encountered an issue trying to update your rsvp. Please reach
                out.
              </p>
              <Button onClick={() => router.push("/")} variant="outline">
                Go to Wedding Site
              </Button>
            </div>
          </div>
        )
      }

      {
        // If the link is invalid
        (props.invite instanceof Error || !props.invite.id) && (
          <div className="w-full">
            <div className="p-8 text-center">
              <h2 className="text-destructive mb-4 text-2xl font-bold">
                Invalid RSVP Link
              </h2>
              <p className="text-muted-foreground mb-6">
                Please use the RSVP link from your invitation.
              </p>
              <Button onClick={() => router.push("/")} variant="outline">
                Go to Wedding Site
              </Button>
            </div>
          </div>
        )
      }
      {
        // if the guest tries using an expired link
        !(props.invite instanceof Error) &&
          new Date(props.invite.inviteExpiration) < new Date() && (
            <div className="w-full">
              <div className="p-8 text-center">
                <h2 className="text-destructive mb-4 text-2xl font-bold">
                  Expired RSVP Link
                </h2>
                <p className="text-muted-foreground mb-6">
                  The RSVP period is now over. You can still follow the event by
                  viewing the gallery
                </p>
                <Button onClick={() => router.push("/")} variant="outline">
                  Go to Wedding Site
                </Button>
              </div>
            </div>
          )
      }
      {
        // if the guest already registered their rsvp
        !(props.invite instanceof Error) && props.invite.rsvp && !editRsvp && (
          <div className="w-full">
            <div className="p-8 text-center">
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
                  onClick={() => setEditRsvp(true)}
                  variant="outline"
                  className="w-full"
                >
                  Update RSVP
                </Button>
              </div>
            </div>
          </div>
        )
      }
      {
        // if the guest has not yet registered their rsvp or wishes to edit it
        !(props.invite instanceof Error) &&
          (!props.invite.rsvp || editRsvp) && (
            // show the invite form
            <>
              <div className="">
                <div className="flex w-full justify-center">
                  <h2 className="text-burnt-orange text-2xl font-semibold">
                    Will you join us?
                  </h2>
                </div>
                <form
                  action=""
                  className="justify-start py-6"
                  onSubmit={handleSubmit}
                >
                  <div className="">
                    <Label
                      className="text-burgundy space-y-3 py-2 text-base"
                      htmlFor="attendance"
                    >
                      Will you be attending?
                    </Label>
                    <RadioGroup
                      value={form.attending}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, attending: value }))
                      }
                      className=""
                      id="attendance"
                    >
                      <div className="border-pink/20 hover:bg-pink/5 flex items-center space-x-3 rounded-lg border p-3">
                        <RadioGroupItem
                          value="yes"
                          id="yes"
                          className="text-burnt-orange border bg-white/90"
                        />
                        <Label
                          htmlFor="yes"
                          className="flex w-full cursor-pointer items-center space-x-2"
                        >
                          <Check className="text-burnt-orange h-4 w-4" />
                          <span>Yes I&apos;ll be there</span>
                        </Label>
                      </div>
                      <div className="border-pink/20 hover:bg-pink/5 flex items-center space-x-3 rounded-lg border p-3">
                        <RadioGroupItem
                          value="no"
                          id="no"
                          className="text-burnt-orange border bg-white/90"
                        />
                        <Label
                          htmlFor="no"
                          className="flex cursor-pointer items-center space-x-2"
                        >
                          <X className="text-muted-foreground h-4 w-4" />
                          <span>Sorry, I can&apos;t make it</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {form.attending === "yes" && (
                    <>
                      {/* How many guests? */}
                      <div className="mt-5 space-y-3">
                        <Label className="text-burgundy text-base">
                          Number of Guests
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Users className="text-burnt-orange h-4 w-4" />
                          <Input
                            id="guestCount"
                            type="number"
                            min="1"
                            max="2"
                            value={form.guestCount}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                guestCount: e.target.value,
                              }))
                            }
                            className="max-w-24"
                          />
                          <span className="text-muted-foreground">
                            person(s)
                          </span>
                        </div>
                      </div>
                      {/* <div className="mt-5 space-y-3">
                        <Label className="text-burgundy text-base">
                          Do you need transportation?
                        </Label>
                      <RadioGroup
                          value={form.requiresTransportation}
                          onValueChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              requiresTransportation: value,
                            }))
                          }
                          className=""
                          id="transportation"
                        >
                          <div className="border-pink/20 hover:bg-pink/5 flex items-center space-x-3 rounded-lg border p-3">
                            <RadioGroupItem
                              value="yes"
                              id="yesTransport"
                              className="text-burnt-orange border bg-white/90"
                            />
                            <Label
                              htmlFor="yesTransport"
                              className="flex w-full cursor-pointer items-center space-x-2"
                            >
                              <Bus className="text-burnt-orange h-4 w-4" />
                              <span>
                                Yes I&apos;ll need help with transportation
                              </span>
                            </Label>
                          </div>
                          <div className="border-pink/20 hover:bg-pink/5 flex w-full items-center space-x-3 rounded-lg border p-3">
                            <RadioGroupItem
                              value="no"
                              id="noTransport"
                              className="text-burnt-orange border bg-white/90"
                            />
                            <Label
                              htmlFor="noTransport"
                              className="flex cursor-pointer items-center space-x-2"
                            >
                              <Car className="text-muted-foreground h-4 w-4" />
                              <span>No thanks, I&apos;ll find my way</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div> */}
                    </>
                  )}
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="submit"
                      className="space-y-6 px-6 py-4 font-semibold text-white/80"
                      variant="pink"
                      disabled={!form.attending}
                    >
                      Complete
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )
      }
    </>
  );
};

export default RsvpForm;
