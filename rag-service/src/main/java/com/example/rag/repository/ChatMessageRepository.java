package com.example.rag.repository;

import com.example.rag.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<ChatMessage> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
}
