package com.rebook.request.repository;

import com.rebook.request.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByReviewedUserId(Long userId);

    boolean existsByRequestIdAndReviewerId(Long requestId, Long reviewerId);
}
