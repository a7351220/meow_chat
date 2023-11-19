import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  Ok,
  Err,
  Result,
  Canister,
} from "azle";
import { v4 as uuidv4 } from "uuid";
import { systemMessage } from "./utils/ai";

/**
 * Message record
 */
const Message = Record({
  source: text,
  content: text,
  id: text,
});

const BaseMessage = Record({
  source: text,
  content: text,
});

const ConversationPayload = Variant({ userIdentity: text });

const AddMessgeToConversationPayload = Record({
  userIdentity: text,
  conversationId: text,
  message: BaseMessage,
});

const Conversation = Record({
  id: text,
  conversation: Vec(Message),
});

const ErrorMessage = Variant({ message: text });

/**
 * Storage for user's conversations
 * @date 11/19/2023 - 3:26:30 PM
 *
 * @type {*}
 */
const userConversation = StableBTreeMap(text, Conversation, 1);

export default Canister({
  createConversation: update(
    [ConversationPayload],
    Result(Conversation, ErrorMessage),
    (payload) => {
      if (typeof payload !== "object" || Object.keys(payload).length === 0) {
        return Err({ message: "Invild payload" });
      }
      const message = { ...systemMessage, id: uuidv4() };
      const conversation = { id: uuidv4(), conversation: [message] };
      userConversation.insert(payload.userIdentity, conversation);
      return Ok(conversation);
    }
  ),

  // The payload is just the user identity
  getConversations: query(
    [text],
    Result(Conversation, ErrorMessage),
    (userIdentity) => {
      if (!userIdentity)
        return Err({ message: "Incorrect user identity found" });
      const conversations = userConversation.get(userIdentity);
      return Ok(conversations.Some);
    }
  ),

  addMessageToConversation: update(
    [AddMessgeToConversationPayload],
    Result(Message, ErrorMessage),
    (payload) => {
      const chat = userConversation.get(payload.userIdentity);
      if ("None" in chat) {
        return Err({
          message: `No conversation found for ${payload.userIdentity}`,
        });
      }

      if (
        typeof payload !== "object" ||
        Object.keys(payload).length === 0 ||
        !payload.message?.content ||
        !payload.message?.source
      ) {
        return Err({ message: "Invild payload" });
      }

      const newMessage = {
        source: payload.message.source,
        content: payload.message.content,
        id: uuidv4(),
      };

      const messages = chat.Some.conversation;
      const updatedMessages = [...messages, newMessage];
      const updatedConversation = {
        id: payload.conversationId,
        conversation: updatedMessages,
      };
      userConversation.insert(payload.userIdentity, updatedConversation);
      return Ok(newMessage);
    }
  ),

  deleteConversation: update(
    [text],
    Result(text, ErrorMessage),
    (userIdentity) => {
      const removedConversation = userConversation.remove(userIdentity);

      if ("None" in removedConversation) {
        return Err({
          message: `Can not delete conversation with for user:${userIdentity}`,
        });
      }

      return Ok(
        `The conversation associated to ${userIdentity} has been deleted`
      );
    }
  ),
});
