package com.example.geminiintegration.dto;

import lombok.Data;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Data
public class GeminiRequest {
    private List<Map<String, Object>> contents;

    public void setPrompt(String prompt) {
        Map<String, Object> content = Map.of(
            "role", "user",
            "parts", Collections.singletonList(
                Map.of("text", prompt)
            )
        );
        this.contents = Collections.singletonList(content);
    }
}