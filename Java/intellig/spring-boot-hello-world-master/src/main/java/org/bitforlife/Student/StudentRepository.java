package org.bitforlife.Student;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, Integer> {

    //findALl
    //findById(id)
    //save(Student)
    //deleteById(id)
    //count()
    //existsById(id)
}
