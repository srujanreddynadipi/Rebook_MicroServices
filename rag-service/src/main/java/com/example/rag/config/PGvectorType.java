package com.example.rag.config;

import com.pgvector.PGvector;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

public class PGvectorType implements UserType<PGvector> {

    @Override
    public int getSqlType() {
        return Types.OTHER;
    }

    @Override
    public Class<PGvector> returnedClass() {
        return PGvector.class;
    }

    @Override
    public boolean equals(PGvector x, PGvector y) {
        if (x == y) return true;
        if (x == null || y == null) return false;
        return x.toString().equals(y.toString());
    }

    @Override
    public int hashCode(PGvector x) {
        return x == null ? 0 : x.toString().hashCode();
    }

    @Override
    public PGvector nullSafeGet(ResultSet rs, int position, SharedSessionContractImplementor session, Object owner)
            throws SQLException {
        String value = rs.getString(position);
        return value == null ? null : new PGvector(value);
    }

    @Override
    public void nullSafeSet(PreparedStatement st, PGvector value, int index, SharedSessionContractImplementor session)
            throws SQLException {
        if (value == null) {
            st.setNull(index, Types.OTHER);
        } else {
            st.setObject(index, value, Types.OTHER);
        }
    }

    @Override
    public PGvector deepCopy(PGvector value) {
        if (value == null) return null;
        try {
            return new PGvector(value.toString());
        } catch (SQLException e) {
            throw new RuntimeException("Failed to copy PGvector", e);
        }
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Serializable disassemble(PGvector value) {
        return value == null ? null : value.toString();
    }

    @Override
    public PGvector assemble(Serializable cached, Object owner) {
        if (cached == null) return null;
        try {
            return new PGvector(cached.toString());
        } catch (SQLException e) {
            throw new RuntimeException("Failed to assemble PGvector", e);
        }
    }
}

