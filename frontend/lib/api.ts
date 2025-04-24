const apiBase = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchServices() {
    const url = `${apiBase}/services`;

    // Build headers – add an identity token when running inside Cloud Run
    const headers: Record<string, string> = {};

    if (typeof window === "undefined") {
        try {
            const metadataURL = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(apiBase)}&format=full`;
            const tokenResp = await fetch(metadataURL, {
                headers: { "Metadata-Flavor": "Google" }
            });
            console.log("identity token fetch", tokenResp.status, metadataURL);

            if (tokenResp.ok) {
                const token = await tokenResp.text();
                headers["Authorization"] = `Bearer ${token}`;
            }
        } catch (err) {
            console.error("Failed to obtain identity token for backend call", err);
        }
    }

    console.log("fetching services from", url);
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load services – ${res.status}`);
    return res.json();
}