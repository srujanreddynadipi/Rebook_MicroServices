package com.example.rag.repository;

import com.example.rag.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUserId(Long userId);

    List<Document> findByUserIdAndProcessed(Long userId, Boolean processed);

    Long countByUserId(Long userId);
}
