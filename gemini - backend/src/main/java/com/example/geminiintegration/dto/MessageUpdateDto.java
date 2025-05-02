package com.example.geminiintegration.dto;

import lombok.Data;

@Data
public class MessageUpdateDto {
    private String newContent;

	public String getNewContent() {
		return newContent;
	}

	public void setNewContent(String newContent) {
		this.newContent = newContent;
	}
}