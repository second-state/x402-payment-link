"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

type ApiKey = {
  id: string;
  name: string;
  createdAt: string;
  revokedAt: string | null;
};

type ApiKeyResponse = { apiKeys: ApiKey[] };

export function ApiKeyList() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();
  const { data: session } = useSession();

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = (await res.json()) as ApiKeyResponse;
      setKeys(data.apiKeys);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast({ title: "Error loading API keys", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    setNewSecret(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      const data = await res.json();
      setNewSecret(data.secret as string);
      setNewName("");
      await fetchKeys();
      toast({ title: "API key created", description: "Copy the secret now; it won’t be shown again." });
    } catch (err) {
      setError((err as Error).message);
      toast({ title: "Error creating key", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke API key");
      await fetchKeys();
      toast({ title: "API key revoked" });
    } catch (err) {
      setError((err as Error).message);
      toast({ title: "Error revoking key", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (session && session.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ToastContainer />
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>New API Key</CardTitle>
          <CardDescription>Create a key for programmatic access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              placeholder="Backend for checkout"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <Button onClick={createKey} disabled={loading || !newName.trim()}>
            {loading ? "Working..." : "Create key"}
          </Button>
          {newSecret && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Secret (copy now)</div>
              <div className="mt-1 break-all font-mono text-xs">{newSecret}</div>
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Only the secret is shown at creation time.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !keys.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner />
              <span>Loading...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="text-sm text-slate-500">No keys yet.</div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 text-sm md:flex-row md:items-center"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{k.name}</div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(k.createdAt).toLocaleString()}
                    </div>
                    {k.revokedAt && (
                      <div className="text-xs text-red-600">
                        Revoked {new Date(k.revokedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 md:mt-0">
                    {!k.revokedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeKey(k.id)}
                        disabled={loading}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
