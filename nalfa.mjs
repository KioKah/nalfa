import { registerChatHooks } from "./module/bootstrap/chat.mjs";
import { registerDiceSoNiceHook } from "./module/bootstrap/diceSoNice.mjs";
import { registerInitHook } from "./module/bootstrap/init.mjs";

registerInitHook();
registerChatHooks();
registerDiceSoNiceHook();
