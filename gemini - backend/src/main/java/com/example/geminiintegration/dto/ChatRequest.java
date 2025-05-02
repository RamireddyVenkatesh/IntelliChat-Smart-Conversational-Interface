package com.example.geminiintegration.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ChatRequest {
    private String prompt;
    private UUID conversationId;
	public String getPrompt() {
		return prompt;
	}
	public void setPrompt(String prompt) {
		this.prompt = prompt;
	}
	public UUID getConversationId() {
		return conversationId;
	}
	public void setConversationId(UUID conversationId) {
		this.conversationId = conversationId;
	}
    
    
}