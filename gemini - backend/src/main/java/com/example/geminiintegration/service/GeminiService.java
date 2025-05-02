package com.example.geminiintegration.service;

import com.example.geminiintegration.dto.GeminiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.api.model}")
    private String apiModel;

    public GeminiService(ObjectMapper objectMapper, @Value("${gemini.api.url}") String apiUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    // Keep the single turn method for potential compatibility if needed,
    // or remove it if all calls will now go through ChatService
    public Mono<GeminiResponse> generateContent(String prompt) {
         // This method now just builds a simple history list and calls the new method
         Map<String, Object> userTurn = Map.of(
             "role", "user",
             "parts", List.of(Map.of("text", prompt)) // Using List.of instead of Collections.singletonList
         );
         return generateContentWithHistory(List.of(userTurn)); // Use the new method
    }


    // NEW method to handle multi-turn conversation history
    public Mono<GeminiResponse> generateContentWithHistory(List<Map<String, Object>> conversationHistory) {
        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode contentsArray = requestBody.putArray("contents");

        // Add each turn (Map representing {role, parts: [{text}]}) to the contents array
        for (Map<String, Object> turn : conversationHistory) {
             // Use convertValue to map the Map directly into a JSON ObjectNode structure
            contentsArray.add(objectMapper.convertValue(turn, ObjectNode.class));
        }

        logger.info("Sending request to Gemini API with history ({} turns), model {}: {}",
                 conversationHistory.size(), apiModel, requestBody.toString());

        String apiPath = String.format("/v1/models/%s:generateContent", apiModel);

        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                    .path(apiPath)
                    .queryParam("key", apiKey)
                    .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(GeminiResponse.class)
                .doOnSuccess(response ->
                    logger.info("Successfully received response from Gemini API using model: {}",
                                       (response != null ? response.getModelVersion() : "unknown")))
                .doOnError(e -> logger.error("Error calling Gemini API: {}", e.getMessage(), e))
                .onErrorResume(Mono::error); // Propagate the error up
    }
}