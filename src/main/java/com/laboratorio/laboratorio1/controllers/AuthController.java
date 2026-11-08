package com.laboratorio.laboratorio1.controllers;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@RestController
public class AuthController {
    private static final ParameterizedTypeReference<Map<String, Object>> MAP =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST =
            new ParameterizedTypeReference<>() {};

    private final RestClient keycloak;
    private final String clientId;
    private final String adminUsername;
    private final String adminPassword;

    public AuthController(
            @Value("${KC_URL:http://localhost:8180}") String url,
            @Value("${keycloak.client-id}") String clientId,
            @Value("${KC_ADMIN_USER:admin}") String adminUsername,
            @Value("${KC_ADMIN_PASSWORD:admin}") String adminPassword) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.keycloak = RestClient.builder().baseUrl(url)
                .requestFactory(factory).build();
        this.clientId = clientId;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @PostMapping("/api/v1/auth/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        try {
            return token("laboratorio1", clientId, request.username().strip(),
                    request.password());
        } catch (RestClientResponseException error) {
            int status = error.getStatusCode().value();
            if (status == 400 || status == 401) {
                throw new ApiFailure(HttpStatus.UNAUTHORIZED,
                        "Usuario o contraseña incorrectos, o cuenta no habilitada.");
            }
            if (status == 429) {
                throw new ApiFailure(HttpStatus.TOO_MANY_REQUESTS,
                        "Demasiados intentos. Intenta nuevamente más tarde.");
            }
            throw unavailable();
        }
    }

    @PostMapping("/api/v1/auth/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request) {
        String adminToken = adminToken();
        Map<String, Object> role = keycloak.get()
                .uri("/admin/realms/laboratorio1/roles/USER")
                .headers(headers -> headers.setBearerAuth(adminToken))
                .retrieve().body(MAP);
        if (role == null || text(role, "id").isBlank()) {
            throw unavailable();
        }

        // El cliente nunca decide el rol de una cuenta nueva.
        Map<String, Object> user = Map.of(
                "username", request.username().strip(),
                "email", request.email().strip(),
                "firstName", request.firstName().strip(),
                "lastName", request.lastName().strip(),
                "enabled", true,
                "emailVerified", false,
                "credentials", List.of(Map.of("type", "password",
                        "value", request.password(), "temporary", false)));
        ResponseEntity<Void> created;
        try {
            created = keycloak.post().uri("/admin/realms/laboratorio1/users")
                    .headers(headers -> headers.setBearerAuth(adminToken))
                    .contentType(MediaType.APPLICATION_JSON).body(user)
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException error) {
            if (error.getStatusCode().value() == 409) {
                throw new ApiFailure(HttpStatus.CONFLICT,
                        "Ya existe una cuenta con ese usuario o correo.");
            }
            if (error.getStatusCode().value() == 400) {
                throw new ApiFailure(HttpStatus.BAD_REQUEST,
                        "Revisa los datos y los requisitos de contraseña.");
            }
            throw unavailable();
        }
        URI location = created.getHeaders().getLocation();
        if (created.getStatusCode().value() != 201 || location == null) {
            throw unavailable();
        }
        String path = location.getPath();
        String userId = path.substring(path.lastIndexOf('/') + 1);
        if (userId.isBlank()) {
            throw unavailable();
        }
        try {
            keycloak.post()
                    .uri("/admin/realms/laboratorio1/users/{id}/role-mappings/realm", userId)
                    .headers(headers -> headers.setBearerAuth(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(Map.of("id", text(role, "id"), "name", "USER")))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException error) {
            try {
                keycloak.delete().uri("/admin/realms/laboratorio1/users/{id}", userId)
                        .headers(headers -> headers.setBearerAuth(adminToken))
                        .retrieve().toBodilessEntity();
            } catch (RestClientException rollbackError) {
                throw new ApiFailure(HttpStatus.SERVICE_UNAVAILABLE,
                        "Registro incompleto. Contacta al administrador antes de repetirlo.");
            }
            throw unavailable();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Cuenta registrada. Ya puedes iniciar sesión."));
    }

    @GetMapping("/api/usuarios")
    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    public List<UserSummary> users(
            @RequestParam(defaultValue = "0") int first,
            @RequestParam(defaultValue = "100") int max) {
        if (first < 0 || max < 1 || max > 100) {
            throw new ApiFailure(HttpStatus.BAD_REQUEST, "Paginación no válida.");
        }
        String token = adminToken();
        List<Map<String, Object>> users = keycloak.get()
                .uri(builder -> builder.path("/admin/realms/laboratorio1/users")
                        .queryParam("first", first).queryParam("max", max)
                        .queryParam("briefRepresentation", true).build())
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve().body(LIST);
        if (users == null) {
            throw unavailable();
        }
        return users.stream().map(user -> new UserSummary(
                text(user, "id"), text(user, "username"), text(user, "email"),
                text(user, "firstName"), text(user, "lastName"),
                Boolean.TRUE.equals(user.get("enabled")))).toList();
    }

    private String adminToken() {
        return text(token("master", "admin-cli", adminUsername, adminPassword),
                "access_token");
    }

    private Map<String, Object> token(
            String realm, String client, String username, String password) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", client);
        form.add("username", username);
        form.add("password", password);
        Map<String, Object> response = keycloak.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(MAP);
        if (response == null || text(response, "access_token").isBlank()) {
            throw unavailable();
        }
        return response;
    }

    private static String text(Map<String, Object> object, String key) {
        return object.get(key) instanceof String value ? value : "";
    }

    private static ApiFailure unavailable() {
        return new ApiFailure(HttpStatus.SERVICE_UNAVAILABLE,
                "El servicio de usuarios no está disponible. Intenta más tarde.");
    }

    @ExceptionHandler(ApiFailure.class)
    public ResponseEntity<Map<String, String>> failure(ApiFailure error) {
        return ResponseEntity.status(error.status)
                .body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<Map<String, String>> upstream(RestClientException error) {
        return failure(unavailable());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validation(
            MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(Map.of("message",
                "Revisa los campos obligatorios, el correo y la contraseña."));
    }

    public record LoginRequest(
            @NotBlank @Size(max = 254) String username,
            @NotBlank @Size(max = 256) String password) {}

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Size(min = 8, max = 256) String password) {}

    public record UserSummary(String id, String username, String email,
                              String firstName, String lastName, boolean enabled) {}

    private static final class ApiFailure extends RuntimeException {
        private final HttpStatus status;
        private ApiFailure(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }
    }
}
