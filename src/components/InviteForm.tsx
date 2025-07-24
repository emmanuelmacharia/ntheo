"use client";

import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface Guest {
  id: string;
  name: string;
  familyName?: string;
  inviteFamily: boolean;
}

const InviteForm = () => {
  const [form, setForm] = useState({
    name: "",
    family: "",
    familyName: "",
    inviteFamily: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Form submitted:", form);
      setLoading(false);
      setForm({ name: "", family: "", familyName: "", inviteFamily: false });
    }, 1000);
  };
  return (
    <div className="bg-pink/5 space-y-4 rounded-lg">
      <h3 className="text-burgundy font-semibold">Invite New Guest(s)</h3>
      <div className="mb-grid-cols-2 grid grid-cols-1 gap-4">
        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Guest Name *</Label>
            <Input
              id="name"
              placeholder="Guest name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="familyName"> Family Details (optional)</Label>
            <Input
              id="familyName"
              placeholder="Mr. & Mrs. Family and children"
              value={form.familyName}
              onChange={handleChange}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteForm;
