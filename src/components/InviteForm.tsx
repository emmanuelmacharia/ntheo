"use client";

import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { createGuestInvite } from "~/server/actions/actions";

interface Guest {
  id: string;
  name: string;
  familyName?: string;
  inviteFamily: boolean;
}

type FormState = Omit<Guest, "id">;

const InviteForm = () => {
  const [form, setForm] = useState<FormState>({
    name: "", // guest name
    familyName: "", // family details
    inviteFamily: false, // whether we invite the whole family
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const submission = await createGuestInvite(form);
    if (submission instanceof Error) {
      console.error("Error creating guest invite:", submission);
      // Handle error (e.g., show a notification)
    } else {
      // Reset form or show success message
    }
    setLoading(false);
    setForm({ name: "", familyName: "", inviteFamily: false });
  };
  return (
    <div className="bg-pink/10 space-y-4 rounded-lg p-6">
      <h3 className="text-burgundy font-semibold">Invite New Guest(s)</h3>
      <div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Guest Name *</Label>
              <Input
                type="text"
                name="name"
                id="name"
                required
                maxLength={256}
                value={form.name}
                placeholder="Guest name"
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="familyName"> Family Details (optional)</Label>
              <Input
                type="text"
                name="familyName"
                id="familyName"
                placeholder="Mr. & Mrs. Family and children"
                value={form.familyName}
                onChange={handleChange}
                maxLength={256}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="my-4 flex items-center space-x-2">
              <Checkbox
                id="inviteFamily"
                name="inviteFamily"
                checked={form.inviteFamily}
                onCheckedChange={(checked) =>
                  setForm({ ...form, inviteFamily: checked ? true : false })
                }
              />
              <Label htmlFor="inviteFamily"> Family Invitation</Label>
            </div>
            <Button
              variant="golden"
              type="submit"
              className="text-primary hover:bg-gold/70 hover:cursor-pointer"
              disabled={loading || !form.name.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Guest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteForm;
