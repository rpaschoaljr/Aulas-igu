package org.bitforlife.Student;

import org.apache.coyote.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {

    private final StudentRepository repository;

    public StudentService(StudentRepository repInjetado) {
        this.repository = repInjetado;
    }

    public List<Student> findAll() {
        return this.repository.findAll();
    }

    public Student save(Student student) {
        return this.repository.save(student);
    }

    public Student update(Integer id, Student student) throws BadRequestException {
        //Verificar se existe alguem com esse id no banco de dados

        if (this.repository.existsById(id)) {
            return this.repository.save(student);
        }

        throw new BadRequestException("O estudante nao existe");
    }


    public Student findById(Integer id) throws BadRequestException {

        Optional<Student> studentOptional = this.repository.findById(id);

        if (studentOptional.isPresent()) {
            return studentOptional.get();
        }

        throw new BadRequestException("O usuário nao existe");
    }

    public boolean deleteById(Integer id) {
        if (this.repository.existsById(id)) {
            this.repository.deleteById(id);
            return true;
        }

        return false;
    }

}
