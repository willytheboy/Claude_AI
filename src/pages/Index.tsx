
import { ChatContainer } from '../components/chat';

export function Index() {
  return (
    <div className="h-screen w-full max-w-2xl mx-auto flex flex-col shadow-2xl">
      <ChatContainer className="flex-1" />
    </div>
  );
}
