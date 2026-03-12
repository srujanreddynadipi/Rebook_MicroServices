package com.rebook.request.service;

import com.rebook.request.dto.request.CreateReviewDto;
import com.rebook.request.dto.response.ReviewResponse;
import com.rebook.request.entity.BookRequest;
import com.rebook.request.entity.RequestStatus;
import com.rebook.request.entity.ReturnStatus;
import com.rebook.request.entity.Review;
import com.rebook.request.repository.BookRequestRepository;
import com.rebook.request.repository.ReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookRequestRepository bookRequestRepository;

    public ReviewResponse createReview(CreateReviewDto dto, Long reviewerId) {
        // 1. Load and validate the request
        BookRequest request = bookRequestRepository.findById(dto.getRequestId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Request not found: " + dto.getRequestId()));

        if (!RequestStatus.APPROVED.equals(request.getStatus())) {
            throw new IllegalStateException("Can only review an approved request");
        }

        if (!ReturnStatus.RETURNED.equals(request.getReturnStatus())) {
            throw new IllegalStateException("Can only review after the book has been returned");
        }

        // 2. Only the borrower (sender) can write the review
        if (!request.getSenderId().equals(reviewerId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the borrower can submit a review");
        }

        // 3. Prevent duplicate review
        if (reviewRepository.existsByRequestIdAndReviewerId(dto.getRequestId(), reviewerId)) {
            throw new IllegalStateException("You have already reviewed this request");
        }

        // 4. Persist review
        Review review = Review.builder()
                .requestId(dto.getRequestId())
                .reviewerId(reviewerId)
                .reviewedUserId(dto.getReviewedUserId())
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        review = reviewRepository.save(review);

        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsForUser(Long userId) {
        return reviewRepository.findByReviewedUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ReviewResponse toResponse(Review review) {
        ReviewResponse res = new ReviewResponse();
        res.setId(review.getId());
        res.setRequestId(review.getRequestId());
        res.setReviewerId(review.getReviewerId());
        res.setReviewedUserId(review.getReviewedUserId());
        res.setRating(review.getRating());
        res.setComment(review.getComment());
        res.setCreatedAt(review.getCreatedAt());
        return res;
    }
}
