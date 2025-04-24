const apiBase = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchServices() {
    console.log("fetching services from", apiBase);
    const res = await fetch(`${apiBase}/services`);
    if (!res.ok) throw new Error("Failed to load services");
    return res.json();
}