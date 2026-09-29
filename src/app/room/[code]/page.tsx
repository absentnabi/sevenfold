import { RoomScreen } from "@/components/room-screen";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomScreen code={code} />;
}
