package com.rebook.notification.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import com.rebook.notification.dto.NotificationResponse;
import com.rebook.notification.mapper.NotificationMapper;
import com.rebook.notification.service.NotificationService;

@WebMvcTest(NotificationController.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService notificationService;

    @MockBean
    private NotificationMapper notificationMapper;

    @Test
    void getNotificationsAcceptsXUserIdHeader() throws Exception {
        when(notificationService.getNotificationsForUser(eq(3L), any()))
                .thenReturn(new PageImpl<>(java.util.List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/notifications").header("X-User-Id", "3"))
                .andExpect(status().isOk());

        verify(notificationService).getNotificationsForUser(eq(3L), any());
    }

    @Test
    void getNotificationsFailsWhenHeaderMissing() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void markReadUsesProvidedHeader() throws Exception {
        mockMvc.perform(put("/api/notifications/15/read").header("userId", "8"))
                .andExpect(status().isOk());

        verify(notificationService).markAsRead(15L, 8L);
    }
}