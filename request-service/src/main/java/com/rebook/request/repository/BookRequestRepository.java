package com.rebook.request.repository;

import com.rebook.request.entity.BookRequest;
import com.rebook.request.entity.RequestStatus;
import com.rebook.request.entity.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookRequestRepository extends JpaRepository<BookRequest, Long> {

    Page<BookRequest> findBySenderId(Long senderId, Pageable pageable);

    Page<BookRequest> findBySenderIdAndStatus(Long senderId, RequestStatus status, Pageable pageable);

    Page<BookRequest> findByReceiverId(Long receiverId, Pageable pageable);

    Page<BookRequest> findByReceiverIdAndStatus(Long receiverId, RequestStatus status, Pageable pageable);

    Optional<BookRequest> findByBookIdAndSenderIdAndStatusIn(Long bookId, Long senderId, List<RequestStatus> statuses);

    boolean existsByBookIdAndStatusIn(Long bookId, List<RequestStatus> statuses);

    List<BookRequest> findByStatusAndReturnStatusAndDueDate(RequestStatus status, ReturnStatus returnStatus,
            LocalDate dueDate);
}
