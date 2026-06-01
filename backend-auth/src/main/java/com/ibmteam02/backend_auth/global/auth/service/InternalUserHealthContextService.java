package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.dto.InternalUserHealthContextResponse;
import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserChronicDisease;
import com.ibmteam02.backend_auth.user.domain.UserProfileHealth;
import com.ibmteam02.backend_auth.user.repository.UserChronicDiseaseRepository;
import com.ibmteam02.backend_auth.user.repository.UserProfileHealthRepository;
import com.ibmteam02.backend_auth.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InternalUserHealthContextService {

    private final UserRepository userRepository;
    private final UserProfileHealthRepository userProfileHealthRepository;
    private final UserChronicDiseaseRepository userChronicDiseaseRepository;

    @Transactional(readOnly = true)
    public InternalUserHealthContextResponse getHealthContext(Long userId) {
        if (userId == null) {
            return new InternalUserHealthContextResponse(null, null, null, false, false, false, false, List.of());
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new InternalUserHealthContextResponse(null, null, null, false, false, false, false, List.of());
        }

        UserProfileHealth health = userProfileHealthRepository.findByUser(user).orElse(null);
        List<String> chronicDiseases = userChronicDiseaseRepository.findByUser(user).stream()
                .map(UserChronicDisease::getDiseaseName)
                .toList();

        return new InternalUserHealthContextResponse(
                user.getUsername(),
                user.getBirthDate(),
                user.getGender(),
                health != null && Boolean.TRUE.equals(health.getIsPregnant()),
                health != null && Boolean.TRUE.equals(health.getIsBreastfeeding()),
                health != null && Boolean.TRUE.equals(health.getIsSmoking()),
                health != null && Boolean.TRUE.equals(health.getIsDrinking()),
                chronicDiseases
        );
    }
}
