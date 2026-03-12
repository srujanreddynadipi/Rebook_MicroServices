package com.rebook.chat.repository;

import com.rebook.chat.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByRequestIdOrderByCreatedAtAsc(Long requestId);

    Page<Message> findByRequestIdOrderByCreatedAtDesc(Long requestId, Pageable pageable);

    List<Message> findByReceiverIdAndIsReadFalse(Long receiverId);

    int countByRequestIdAndReceiverIdAndIsReadFalse(Long requestId, Long receiverId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Message m
            SET m.isRead = true
            WHERE m.requestId = :requestId
              AND m.receiverId = :receiverId
              AND m.isRead = false
            """)
    int markAllAsRead(@Param("requestId") Long requestId, @Param("receiverId") Long receiverId);

    @Query(value = """
            SELECT m.*
            FROM messages m
            JOIN (
                SELECT request_id, MAX(created_at) AS latest_created_at
                FROM messages
                WHERE sender_id = :userId OR receiver_id = :userId
                GROUP BY request_id
            ) latest ON latest.request_id = m.request_id AND latest.latest_created_at = m.created_at
            WHERE m.sender_id = :userId OR m.receiver_id = :userId
            ORDER BY m.created_at DESC
            """, nativeQuery = true)
    List<Message> findInboxByUserId(@Param("userId") Long userId);
}
