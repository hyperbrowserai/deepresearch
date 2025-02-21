// app/api/chat/local.ts

// creat nextjs backend route

export async function POST(req: Request) {
  const { messages } = await req.json();
  console.log("backend messages", messages);

  return new Response(JSON.stringify({ text: "Hello, world!" }));
}
