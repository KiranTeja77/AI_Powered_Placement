package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TokenCodecTest {

    @Test
    void tokensAreUrlSafeAndLongEnough() {
        String token = TokenCodec.newToken();
        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void tokensDoNotRepeat() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            assertThat(seen.add(TokenCodec.newToken())).isTrue();
        }
    }

    @Test
    void hashIsDeterministicSha256Hex() {
        assertThat(TokenCodec.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(TokenCodec.hash("abc")).isEqualTo(TokenCodec.hash("abc"));
    }

    @Test
    void hashNeverEqualsTheToken() {
        String token = TokenCodec.newToken();
        assertThat(TokenCodec.hash(token)).isNotEqualTo(token).hasSize(64);
    }
}
