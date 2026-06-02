"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

export default function ProfilePlaceholder() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-white">Student Profile Settings</h2>
      
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl text-white">Account Management</CardTitle>
          <CardDescription className="text-slate-400">
            This is a placeholder for account settings and profile configurations.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Personal details, passwords update, target exam settings, and DPDP GDPR privacy controls will be rendered here.
        </CardContent>
      </Card>
    </div>
  );
}
