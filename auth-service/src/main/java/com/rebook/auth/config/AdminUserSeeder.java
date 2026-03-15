package com.rebook.auth.config;

import com.rebook.auth.entity.Role;
import com.rebook.auth.entity.User;
import com.rebook.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminUserSeeder implements CommandLineRunner {

    private static final String ADMIN_EMAIL = "admin@gmail.com";
    private static final String ADMIN_PASSWORD = "Admin@123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        User admin = userRepository.findByEmail(ADMIN_EMAIL).orElse(null);

        if (admin == null) {
            User newAdmin = User.builder()
                    .name("System Admin")
                    .email(ADMIN_EMAIL)
                    .password(passwordEncoder.encode(ADMIN_PASSWORD))
                    .role(Role.ROLE_ADMIN)
                    .city("Admin City")
                    .mobile("0000000000")
                    .isBanned(false)
                    .build();
            userRepository.save(newAdmin);
            log.info("Seeded default admin account: {}", ADMIN_EMAIL);
            return;
        }

        boolean changed = false;

        if (admin.getRole() != Role.ROLE_ADMIN) {
            admin.setRole(Role.ROLE_ADMIN);
            changed = true;
        }

        if (admin.isBanned()) {
            admin.setBanned(false);
            changed = true;
        }

        if (!passwordEncoder.matches(ADMIN_PASSWORD, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
            changed = true;
        }

        if (changed) {
            userRepository.save(admin);
            log.info("Updated default admin account: {}", ADMIN_EMAIL);
        }
    }
}
