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

const ConversationPayload = Variant({ convetionId: text });

const AddMessgeToConversationPayload = Variant({
  conversationId: text,
  message: BaseMessage,
});

const UpdateMessagePayload = Variant({
  messageId: text,
  conversationId: text,
  content: text,
});

const DeleteMessagePayload = Variant({
  messageId: text,
  conversationId: text,
});

const ErrorMessage = Variant({ message: text });

/**
 * Create a storage for conversation
 * @param text conversation id
 * @param Message message record for a conversation
 * @param 0 memory id
 */
let conversationStorage = StableBTreeMap(text, Message, 0);

export default Canister({
  getConversations: query([], Vec(Message), () => {
    return conversationStorage.values();
  }),

  getConversationById: query([text], Result(Message, ErrorMessage), (id) => {
    const messages = conversationStorage.get(id);
    console.log({ messages });
    if ("None" in messages) {
      return Err({ message: `No conversation found for ${id}` });
    }
    return messages;
  }),

  createConversation: update(
    [ConversationPayload],
    Result(ConversationPayload, ErrorMessage),
    (payload) => {
      if (typeof payload !== "object" || Object.keys(payload).length === 0) {
        return Err({ message: "Invild payload" });
      }
      const message = { ...systemMessage, id: uuidv4() };
      conversationStorage.insert(payload.convetionId, message);
      return Ok(payload);
    }
  ),

  addMessageToConversation: update(
    [AddMessgeToConversationPayload],
    Result(Message, ErrorMessage),
    (payload) => {
      const messages = conversationStorage.get(payload.conversationId);
      if ("None" in messages) {
        return Err({
          message: `No conversation found for ${payload.conversationId}`,
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
      const updatedMessages = [...messages, newMessage];
      conversationStorage.insert(payload.conversationId, updatedMessages);
      return Ok(newMessage);
    }
  ),

  deleteConversation: update([text], Result(text, ErrorMessage), (id) => {
    const removedConversation = conversationStorage.remove(id);

    if ("None" in removedConversation) {
      return Err({ message: `Can not delete conversation with id:${id}` });
    }

    return Ok(id);
  }),

  updateMessage: update(
    [UpdateMessagePayload],
    Result(UpdateMessagePayload, ErrorMessage),
    (payload) => {
      const messages = conversationStorage.get(payload.conversationId);
      if ("None" in messages) {
        return Err({
          message: `Can not update conversation with id:${payload.messageId}`,
        });
      }

      const updatedMessages = messages.map((message: any) =>
        message.id === payload.messageId
          ? { ...message, content: payload.content }
          : message
      );

      conversationStorage.insert(payload.conversationId, updatedMessages);
      return Ok(payload);
    }
  ),

  deleteMessage: update(
    [DeleteMessagePayload],
    Result(text, ErrorMessage),
    (payload) => {
      const messages = conversationStorage.get(payload.conversationId);

      if ("None" in messages) {
        return Err({
          message: `Can not update conversation with id:${payload.messageId}`,
        });
      }

      const udpatedMessage = messages.filter(
        (message: any) => message.id !== payload.messageId
      );
      conversationStorage.insert(udpatedMessage);
      return Ok(payload.messageId as string);
    }
  ),
});
