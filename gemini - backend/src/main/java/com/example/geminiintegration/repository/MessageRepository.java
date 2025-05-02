package com.example.geminiintegration.repository;

import com.example.geminiintegration.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import jakarta.transaction.Transactional;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderBySequenceNumberAsc(UUID conversationId);

    @Transactional
    void deleteByConversationId(UUID conversationId);

    @Transactional
    void deleteByConversationIdAndSequenceNumberGreaterThan(UUID conversationId, int sequenceNumber);

    List<Message> findByConversationIdAndSequenceNumberLessThanEqualOrderBySequenceNumberAsc(UUID conversationId, int sequenceNumber);
}